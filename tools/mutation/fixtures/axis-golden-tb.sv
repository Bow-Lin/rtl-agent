`timescale 1ns/1ps
module tb;
  reg clk=0,rst=1;
  always #5 clk=~clk;
  reg [7:0] s_axis_tdata=0;
  reg s_axis_tvalid=0,s_axis_tlast=0,s_axis_tuser=0,m_axis_tready=0;
  wire s_axis_tready,m_axis_tvalid,m_axis_tlast,m_axis_tuser;
  wire [7:0] m_axis_tdata;
  axis_fifo #(.DEPTH(8),.DATA_WIDTH(8),.KEEP_ENABLE(0),.LAST_ENABLE(1),.USER_ENABLE(1),.RAM_PIPELINE(1),.FRAME_FIFO(0)) dut(
    .clk(clk),.rst(rst),.s_axis_tdata(s_axis_tdata),.s_axis_tkeep(1'b1),
    .s_axis_tvalid(s_axis_tvalid),.s_axis_tready(s_axis_tready),.s_axis_tlast(s_axis_tlast),
    .s_axis_tid(8'b0),.s_axis_tdest(8'b0),.s_axis_tuser(s_axis_tuser),
    .m_axis_tdata(m_axis_tdata),.m_axis_tvalid(m_axis_tvalid),.m_axis_tready(m_axis_tready),
    .m_axis_tlast(m_axis_tlast),.m_axis_tuser(m_axis_tuser),.pause_req(1'b0));
  reg [9:0] queue[0:4095];
  integer head=0,tail=0,reads=0,writes=0,stalls=0,i;
  reg stalled=0, accepted=0;
  reg [9:0] held;
  always @(posedge clk) begin
    accepted=s_axis_tvalid && s_axis_tready;
    if(rst) begin head=0;tail=0;stalled=0;end
    else begin
      if(stalled && (!m_axis_tvalid || {m_axis_tuser,m_axis_tlast,m_axis_tdata} !== held)) $fatal(1,"BACKPRESSURE_STABILITY");
      if(s_axis_tvalid && s_axis_tready) begin
        queue[tail]={s_axis_tuser,s_axis_tlast,s_axis_tdata};tail=tail+1;writes=writes+1;
      end
      if(m_axis_tvalid && m_axis_tready) begin
        if(head>=tail || {m_axis_tuser,m_axis_tlast,m_axis_tdata} !== queue[head]) $fatal(1,"FIFO_ORDER head=%0d",head);
        head=head+1;reads=reads+1;
      end
      stalled=m_axis_tvalid && !m_axis_tready;
      held={m_axis_tuser,m_axis_tlast,m_axis_tdata};
      if(stalled) stalls=stalls+1;
    end
  end
  task cycle(input bit offer,input bit ready);
    begin
      @(negedge clk);
      if(!s_axis_tvalid || accepted) begin
        s_axis_tvalid=offer;s_axis_tdata=8'(writes*37+11);s_axis_tlast=(writes%5==4);s_axis_tuser=(writes%7==0);
      end
      m_axis_tready=ready;
    end
  endtask
  initial begin
    repeat(4) @(negedge clk);rst=0;
    // Fill and stall, mixed throughput, repeated wraps, then flush queued data.
    for(i=0;i<40;i=i+1)cycle(1,0);
    for(i=0;i<700;i=i+1)cycle(i%7!=0,i%5!=0);
    @(negedge clk);rst=1;s_axis_tvalid=0;m_axis_tready=0;
    repeat(4) @(negedge clk);rst=0;
    for(i=0;i<300;i=i+1)cycle(i%3!=0,i%4!=0);
    cycle(0,1);
    while(s_axis_tvalid) cycle(0,1);
    repeat(30) @(negedge clk);
    if(head!=tail || reads<300 || stalls<20) $fatal(1,"INSUFFICIENT_OR_UNDRAINED");
    $display("AXIS_GOLDEN_PASS reads=%0d writes=%0d stalls=%0d",reads,writes,stalls);$finish;
  end
  initial begin #100000;$fatal(1,"TIMEOUT");end
endmodule
