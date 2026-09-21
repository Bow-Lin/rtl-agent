`timescale 1ns/1ps
module tb;
  reg i_clk=0, i_reset=0, i_wr=0, i_rd=0;
  reg [7:0] i_data=0;
  wire o_empty_n, o_err;
  wire [7:0] o_data;
  wire [15:0] o_status;
  ufifo #(.BW(8),.LGFLEN(4),.RXFIFO(1)) dut(.*);
  always #5 i_clk=~i_clk;
  reg [7:0] queue[0:4095];
  integer head=0, tail=0, used=0, checks=0, reads=0;
  integer i,j;
  task flags;
    begin
      if(o_empty_n !== (used!=0) || o_status[11:2] !== used[9:0]
         || o_status[15:12] !== 4'd4 || o_status[1] !== (used>=8)
         || o_status[0] !== (used!=0)) $fatal(1,"STATUS_FAIL used=%0d status=%h",used,o_status);
      checks=checks+1;
    end
  endtask
  task step(input bit wr,input bit rd,input [7:0] value);
    bit accepted_write,accepted_read;
    begin
      @(negedge i_clk); i_wr=wr; i_rd=rd; i_data=value;
      accepted_read=rd && used>0;
      accepted_write=wr && (used<15 || rd);
      #1;
      if(o_err !== (wr && !accepted_write)) $fatal(1,"OVERFLOW_FLAG");
      @(posedge i_clk);
      if(accepted_read) begin
        if(o_data !== queue[head]) $fatal(1,"DATA_FAIL index=%0d expected=%h actual=%h",head,queue[head],o_data);
        head=head+1; used=used-1; reads=reads+1;
      end
      if(accepted_write) begin queue[tail]=value; tail=tail+1; used=used+1; end
      #1; flags;
    end
  endtask
  task reset_fifo;
    begin
      @(negedge i_clk); i_wr=0; i_rd=0; i_reset=1;
      @(posedge i_clk); #1; head=0;tail=0;used=0;flags;
      @(negedge i_clk); i_reset=0;
    end
  endtask
  initial begin
    reset_fifo;
    for(j=0;j<8;j=j+1) begin
      for(i=0;i<15;i=i+1) step(1,0,8'(j*15+i));
      step(1,0,8'hff); // documented overflow rejection
      step(1,1,8'had); // replacement while full
      for(i=0;i<15;i=i+1) step(0,1,0);
      step(0,1,0); // empty read ignored
    end
    step(1,1,8'h12); // empty simultaneous transfer stores the write
    for(i=0;i<64;i=i+1) step(1,1,8'(i^8'ha5));
    step(0,1,0);
    step(1,0,8'hab);reset_fifo;
    for(i=0;i<32;i=i+1) begin step(1,0,8'(i));step(0,1,0);end
    $display("UFIFO_GOLDEN_PASS checks=%0d reads=%0d",checks,reads);$finish;
  end
  initial begin #100000;$fatal(1,"TIMEOUT");end
endmodule
