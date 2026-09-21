`timescale 1ns/1ps
module tb;
  reg clk=0, reset=0, write=0, read=0, clear=0;
  reg [31:0] data_in=0;
  wire [31:0] data_out;
  wire almost_full, full, almost_empty, empty;
  wire [3:0] cnt;
  eth_fifo dut(.*);
  always #5 clk=~clk;
  reg [31:0] queue[0:1023];
  integer head=0, tail=0, used=0, checks=0, reads=0;
  integer i,j;
  task flags;
    begin
      if(cnt !== used[3:0] || empty !== (used==0) || full !== (used==8)
          || almost_empty !== (used==1) || almost_full !== (used==7))
        $fatal(1,"STATUS_FAIL count=%0d expected=%0d",cnt,used);
      checks=checks+1;
    end
  endtask
  task step(input bit wr, input bit rd, input [31:0] value);
    begin
      @(negedge clk);
      if((rd && used==0) || (wr && used==8)) $fatal(1,"INVALID_STIMULUS");
      write=wr; read=rd; data_in=value;
      @(posedge clk); #1;
      if(rd) begin
        if(data_out !== queue[head]) $fatal(1,"DATA_FAIL index=%0d expected=%h actual=%h",head,queue[head],data_out);
        head=head+1; used=used-1; reads=reads+1;
      end
      if(wr) begin queue[tail]=value; tail=tail+1; used=used+1; end
      flags;
    end
  endtask
  task flush(input bit use_reset);
    begin
      @(negedge clk); write=0; read=0;
      reset=use_reset; clear=!use_reset;
      @(posedge clk); #1;
      used=0; head=0; tail=0; flags;
      @(negedge clk); reset=0; clear=0;
    end
  endtask
  initial begin
    flush(1);
    // Multiple complete wraps, fill/full, drain/empty and threshold crossings.
    for(j=0;j<8;j=j+1) begin
      for(i=0;i<8;i=i+1) step(1,0,32'h12340000+j*8+i);
      step(0,0,0);
      for(i=0;i<8;i=i+1) step(0,1,0);
    end
    for(i=0;i<4;i=i+1) step(1,0,i);
    for(i=0;i<64;i=i+1) step(1,1,32'hfedc0000+i);
    for(i=0;i<4;i=i+1) step(0,1,0);
    // Clear and asynchronous reset both discard queued data.
    step(1,0,32'hdeadbeef); flush(0);
    step(1,0,32'hffffffff); step(0,1,0);
    step(1,0,32'habcdef01); flush(1);
    for(i=0;i<32;i=i+1) begin step(1,0,32'h55000000+i); step(0,1,0); end
    $display("ETH_FIFO_GOLDEN_PASS checks=%0d reads=%0d",checks,reads);
    $finish;
  end
  initial begin #100000; $fatal(1,"TIMEOUT"); end
endmodule
